from django.contrib import admin
from .models import Resume, PersonalInfo, WorkExperience, Education, Language, Project, ProjectLink, Certification, Skills
# Register your models here.
admin.site.register(Resume)
admin.site.register(PersonalInfo)
admin.site.register(WorkExperience)
admin.site.register(Education)
admin.site.register(Language)
admin.site.register(Project)
admin.site.register(ProjectLink)
admin.site.register(Certification)
admin.site.register(Skills)
