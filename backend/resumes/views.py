from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import translation
from .models import Resume
from .serializers import ResumeSerializer, RegisterSerializer
import os
from cvforge_project import settings
from weasyprint import HTML, CSS
from django.views.decorators.http import require_GET
import json


# Django locale code used to translate built-in template constructs
# (e.g. the {{ ... |date:"M Y" }} month names) for each resume language.
LOCALE_BY_LANGUAGE = {
    'EN': 'en',
    'UA': 'uk',
}

# Labels used inside the resume_pdf.html templates. Every template pulls
# its section headings and static strings from here via {{ labels.xxx }},
# switched based on resume.language ('EN' or 'UA').
TEMPLATE_LABELS = {
    'EN': {
        'profile': 'Profile',
        'employment': 'Employment',
        'education': 'Education',
        'projects': 'Pet-projects',
        'certifications': 'Certifications',
        'skills': 'Skills',
        'languages': 'Languages',
        'contact': 'Contact',
        'contacts': 'Contacts',
        'links': 'Links',
        'personal_details': 'Personal details',
        'present': 'Present',
        'graduation_year': 'Graduation year',
        'link': 'Link',
        'no_experience': 'No work experience added.',
        'no_projects': 'No projects added.',
        'no_education': 'No education added.',
        'no_languages': 'Not specified.',
        'no_certifications': 'No certifications added.',
    },
    'UA': {
        'profile': 'Про мене',
        'employment': 'Досвід роботи',
        'education': 'Освіта',
        'projects': 'Проєкти (Pet Projects)',
        'certifications': 'Сертифікати',
        'skills': 'Навички',
        'languages': 'Мови',
        'contact': 'Контакти',
        'contacts': 'Контакти',
        'links': 'Посилання',
        'personal_details': 'Особисті дані',
        'present': 'дотепер',
        'graduation_year': 'Рік випуску',
        'link': 'Посилання',
        'no_experience': 'Досвід роботи відсутній.',
        'no_projects': 'Проєкти відсутні.',
        'no_education': 'Інформація про освіту відсутня.',
        'no_languages': 'Не вказано.',
        'no_certifications': 'Сертифікати відсутні.',
    },
}


def get_labels(resume):
    """Return the label dict for a resume, falling back to English."""
    return TEMPLATE_LABELS.get(resume.language, TEMPLATE_LABELS['EN'])


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
        'certifications': resume.certifications.all,
        'labels': get_labels(resume),
    }

    with translation.override(LOCALE_BY_LANGUAGE.get(resume.language, 'en')):
        html_string = render_to_string(f'resumes/{template}/resume_pdf.html', context)

    pdf_bytes = HTML(
        string=html_string, 
        base_url=request.build_absolute_uri()
    ).write_pdf(
        stylesheets=[css],
        presentational_hints=True,
    )
    
    return HttpResponse(pdf_bytes, content_type='application/pdf')


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@require_GET
def public_resume(request, slug):
    template = str(request.GET.get('template'))
    resume = get_object_or_404(Resume, slug = slug, is_public = True)
    skill_levels = {
        'None': 0,
        'Novice': 1,
        'Advanced Beginner': 2,
        'Competent': 3,
        'Proficient': 4,
        'Expert': 5,
    }
    print(resume)
    with translation.override(LOCALE_BY_LANGUAGE.get(resume.language, 'en')):
        html_content = render_to_string(f'resumes/{template}/resume_pdf.html', context = {
            'css_path': f'/static/templates/resumes/{template}/static/css/styles.css', 
            'resume': resume, 
            'personal_info' : resume.personal_info,
            'experience': resume.experience.all,
            'education': resume.education.all,
            'languages': resume.languages.all,
            'links': resume.links.all,
            'skills': resume.skills.all,
            'skill_levels': skill_levels,
            'projects': resume.projects.all,
            'certifications': resume.certifications.all,
            'labels': get_labels(resume),
        })
    return HttpResponse(html_content)
