from django.urls import path

from . import views

app_name = 'authentication'

urlpatterns = [
    path('validate-code/', views.ValidateCodeView.as_view(), name='validate-code'),
    path('admin/login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('admin/logout/', views.AdminLogoutView.as_view(), name='admin-logout'),
    path(
        'admin/access-codes/',
        views.GenerateAccessCodeView.as_view(),
        name='access-code-generate',
    ),
    path(
        'admin/access-codes/<int:pk>/deactivate/',
        views.DeactivateAccessCodeView.as_view(),
        name='access-code-deactivate',
    ),
]
