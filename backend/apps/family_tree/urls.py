from django.urls import path

from . import views

app_name = 'family_tree'

urlpatterns = [
    path('', views.FamilyTreeView.as_view(), name='tree'),
    path('members/<int:pk>/', views.FamilyMemberDetailView.as_view(), name='member-detail'),
]
