from django.urls import path

from . import views

app_name = 'stories_library'

urlpatterns = [
    path('', views.StoryListView.as_view(), name='story-list'),
    path('admin/', views.StoryAdminListCreateView.as_view(), name='story-admin-list-create'),
    path('admin/<int:pk>/', views.StoryAdminDetailView.as_view(), name='story-admin-detail'),
    path('<int:pk>/', views.StoryDetailView.as_view(), name='story-detail'),
]
