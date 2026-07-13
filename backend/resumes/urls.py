from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('resumes/', views.resume_list_create, name='resume_list'),
    path('resumes/<int:id>/', views.resume_detail_update_delete, name='resume_detail'),
    path('resumes/<int:id>/export/', views.resume_export_pdf)
   
]
