from django.urls import path

from . import views

app_name = 'anniversary'

urlpatterns = [
    path('events/', views.AnniversaryEventListView.as_view(), name='event-list'),
]
