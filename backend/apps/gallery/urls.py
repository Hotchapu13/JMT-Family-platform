from django.urls import path

from . import views

app_name = 'gallery'

urlpatterns = [
    path('photos/', views.PhotoListView.as_view(), name='photo-list'),
    path('photos/bulk-upload/', views.PhotoBulkUploadView.as_view(), name='photo-bulk-upload'),
    path('photos/<int:pk>/', views.PhotoDetailView.as_view(), name='photo-detail'),
    path(
        'photos/<int:pk>/status/',
        views.PhotoStatusUpdateView.as_view(),
        name='photo-status-update',
    ),
]
