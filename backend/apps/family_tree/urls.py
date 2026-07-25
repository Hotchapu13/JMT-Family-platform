from django.urls import path

from . import views

app_name = 'family_tree'

urlpatterns = [
    path('', views.FamilyTreeView.as_view(), name='tree'),
    path('members/<int:pk>/', views.FamilyMemberDetailView.as_view(), name='member-detail'),
    path(
        'admin/members/',
        views.FamilyMemberAdminListCreateView.as_view(),
        name='member-admin-list-create',
    ),
    path(
        'admin/members/<int:pk>/',
        views.FamilyMemberAdminDetailView.as_view(),
        name='member-admin-detail',
    ),
]
