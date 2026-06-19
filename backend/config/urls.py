from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path


def robots_txt(request):
    """This platform must never be indexed by search engines."""
    return HttpResponse('User-agent: *\nDisallow: /\n', content_type='text/plain')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('robots.txt', robots_txt, name='robots-txt'),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/family-tree/', include('apps.family_tree.urls')),
    path('api/v1/gallery/', include('apps.gallery.urls')),
    path('api/v1/stories/', include('apps.stories_library.urls')),
    path('api/v1/anniversary/', include('apps.anniversary.urls')),
]
