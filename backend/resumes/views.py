from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.template.loader import render_to_string
from .models import Resume
from .serializers import ResumeSerializer
import os
from cvforge_project import settings
from weasyprint import HTML, CSS
import json


def _parse_multipart_resume_data(request):
    data = request.data.dict()

    json_fields = [
        'personal_info', 'links', 'experience',
        'education', 'languages', 'skills', 'projects', 'certifications',
    ]

    for field in json_fields:
        raw = data.get(field)
        if raw:
            try:
                data[field] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass

    photo_file = request.FILES.get('photo')
    if photo_file:
        if not isinstance(data.get('personal_info'), dict):
            data['personal_info'] = {}
        data['personal_info']['photo'] = photo_file

    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def resume_list_create(request):
    if request.method == "POST":
        data = _parse_multipart_resume_data(request)
        serializer = ResumeSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == "GET":
        resumes = Resume.objects.filter(user=request.user)
        serializer = ResumeSerializer(resumes, many=True, context={'request': request})
        return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def resume_detail_update_delete(request, id):
    resume = get_object_or_404(Resume, pk=id, user=request.user)

    if request.method == 'GET':
        serializer = ResumeSerializer(resume)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = (request.method == 'PATCH')
        data = _parse_multipart_resume_data(request)
        serializer = ResumeSerializer(resume, data=data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        resume.delete()
        return Response({"message": "Резюме успішно видалено"}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def resume_export_pdf(request, id):
    template = str(request.GET.get('template'))
    resume = get_object_or_404(Resume, pk=id, user=request.user)
    css_filename = 'css/styles.css'
    css_path = os.path.join(
        settings.BASE_DIR, 
        'resumes', 'templates', 'resumes', template, 'static', css_filename
    )
    css = CSS(filename=css_path)
    skill_levels = {
        'None': 0,
        'Novice': 1,
        'Advanced Beginner': 2,
        'Competent': 3,
        'Proficient': 4,
        'Expert': 5,
    }
        
    context = {
        'resume': resume,
        'personal_info' : resume.personal_info,
        'experience': resume.experience.all,
        'education': resume.education.all,
        'languages': resume.languages.all,
        'links': resume.links.all,
        'skills': resume.skills.all,
        'skill_levels': skill_levels,
        'projects': resume.projects.all,
        'certifications': resume.certifications.all
    }
    
    
    html_string = render_to_string(f'resumes/{template}/resume_pdf.html', context)
    
    pdf_bytes = HTML(
        string=html_string, 
        base_url=request.build_absolute_uri()
    ).write_pdf(
        stylesheets=[css],
        presentational_hints=True,
    )
    
    return HttpResponse(pdf_bytes, content_type='application/pdf')