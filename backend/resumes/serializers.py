from rest_framework import serializers
from .models import Resume, PersonalInfo, WorkExperience, Education, ProjectLink, Language, Project, Certification, Skills
from drf_writable_nested.serializers import WritableNestedModelSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'name', 'level']

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skills
        fields = ['id', 'name', 'level']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'technologies', 'link']


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'name', 'issuing_organization', 'issue_date', 'url']


class ProjectLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLink
        fields = ['id', 'platform', 'url']

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ['id', 'institution', 'degree', 'field_of_study', 'start_year', 'graduation_year']

class PersonalInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalInfo
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'photo']


class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = ['id', 'company_name', 'position', 'start_date', 'end_date', 'is_current', 'description']


class ResumeSerializer(WritableNestedModelSerializer):

    personal_info = PersonalInfoSerializer(many = False, required = True)
    experience = WorkExperienceSerializer(many = True, required = False)
    education = EducationSerializer(many = True, required = False)
    links = ProjectLinkSerializer(many = True, required = False)
    languages = LanguageSerializer(many = True, required = False)
    skills = SkillSerializer(many = True, required = False)
    projects = ProjectSerializer(many = True, required = False)
    certifications = CertificationSerializer(many = True, required = False)

    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Resume
        fields = ['id', 'user', 'title', 'summary', 'slug', 'is_public', 'language', 'personal_info', 'experience', 'education', 'links', 'skills', 'languages', 'projects', 'certifications', 'created_at', 'updated_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
 
    class Meta:
        model = User
        fields = ['username', 'password']
 
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Користувач з таким ім'ям вже існує.")
        return value
 
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
        )
        return user