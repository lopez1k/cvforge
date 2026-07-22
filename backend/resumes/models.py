from django.db import models
from django.conf import settings
import uuid 

class Resume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='resumes')
    title = models.CharField(verbose_name = "Назва", max_length = 255)
    summary = models.TextField(verbose_name = "Опис", max_length = 500, null = True, blank = True)
    slug = models.UUIDField(default=uuid.uuid4, editable = False, unique = True)
    is_public = models.BooleanField(default = False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

def user_directory_path(instance, filename):
    return "user_{0}/{1}".format(instance.resume.user.id, filename)



class PersonalInfo(models.Model):
    
    resume = resume = models.OneToOneField(
        Resume, 
        on_delete=models.CASCADE, 
        related_name='personal_info'
    )
    first_name = models.CharField(max_length = 255)
    last_name = models.CharField(max_length = 255)
    photo = models.FileField(upload_to=user_directory_path, null = True, blank = True)
    email = models.EmailField(null = True, blank = True)
    phone_number = models.CharField(max_length = 15, null = True, blank = True)


class WorkExperience(models.Model):
    resume = models.ForeignKey(Resume, on_delete = models.CASCADE, related_name='experience')
    company_name = models.CharField(max_length = 255)
    position = models.CharField(max_length = 255)
    start_date = models.DateField()
    end_date = models.DateField(null = True, blank = True)
    is_current = models.BooleanField(default = False, db_default = False)
    description = models.TextField()

class Education(models.Model):
    resume = models.ForeignKey(Resume, on_delete = models.CASCADE, related_name = "education")
    institution = models.CharField(max_length = 255)
    degree = models.CharField(max_length = 255)
    field_of_study = models.CharField(max_length = 255)
    start_year = models.IntegerField()
    graduation_year = models.IntegerField()

class ProjectLink(models.Model):
    PLATFORM_CHOICES = [
        ('linkedin', 'LinkedIn'),
        ('github', 'GitHub'),
        ('gitlab', 'GitLab'),
        ('telegram', 'Telegram'),
        ('portfolio', 'Portfolio / Website'),
        ('behance', 'Behance'),
        ('other', 'Other'),
    ]
    
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='links')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    url = models.URLField()

    def __str__(self):
        return f"{self.get_platform_display()}: {self.url}"
    

class Language(models.Model):
    LEVEL_CHOICES = [
        ('A1', 'Beginner / A1'),
        ('A2', 'Elementary / A2'),
        ('B1', 'Intermediate / B1'),
        ('B2', 'Upper-Intermediate / B2'),
        ('C1', 'Advanced / C1'),
        ('C2', 'Proficient / C2'),
        ('Native', 'Native Speaker'),
    ]
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='languages')
    name = models.CharField(max_length=100) 
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    

class Skills(models.Model):
    LEVEL_CHOICES = [
        ('None', ''),
        ('Novice', 'Новачок'),
        ('Advanced Beginner', 'Початківець-практик'),
        ('Competent', 'Компетентний'),
        ('Proficient', 'Професіонал'),
        ('Expert', 'Експерт'),
    ]
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)

    def level_as_number(self):
        levels = {'Novice': 1, 'Advanced Beginner': 2, 'Competent': 3, 'Proficient': 4, 'Expert': 5}
        return levels.get(self.level, 0)

    class Meta:
        verbose_name = "Skill"
class Project(models.Model):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255) 
    description = models.TextField()
    technologies = models.CharField(max_length=255)
    link = models.URLField(blank=True, null=True)

class Certification(models.Model):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=255) 
    issuing_organization = models.CharField(max_length=255)
    issue_date = models.DateField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)