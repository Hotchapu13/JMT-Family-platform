"""
Cloudinary URL-based transformations for the gallery.

Image variants (thumbnail, web-optimized) and the viewer-facing watermark
overlay are generated entirely at serve-time by appending transformation
parameters to the stored image's Cloudinary URL — no extra image files are
ever stored, and no local resizing/watermarking pipeline is built. This is
the idiomatic Cloudinary pattern (chained transformations via `build_url`).

The watermark overlay assumes a Cloudinary-hosted asset has been uploaded
under the public ID "watermark" — see Cloudinary's overlay-transformation
docs. All viewer-facing URLs (thumbnail_url, web_url) apply it; the
admin-only preview (admin_preview_url) deliberately does not, so the
Editor-in-Chief reviews drafts unwatermarked.
"""
from cloudinary import CloudinaryImage

WATERMARK_OVERLAY = {
    'overlay': 'watermark',
    'opacity': 40,
    'gravity': 'south_east',
    'x': 10,
    'y': 10,
}


def _build(image_field, steps):
    if not image_field:
        return None
    return CloudinaryImage(image_field.name).build_url(transformation=steps)


def thumbnail_url(image_field):
    """Small, watermarked thumbnail used in gallery grid views."""
    return _build(
        image_field,
        [
            WATERMARK_OVERLAY,
            {'width': 300, 'height': 300, 'crop': 'fill', 'quality': 'auto', 'fetch_format': 'auto'},
        ],
    )


def web_url(image_field):
    """Larger, watermarked image used in the lightbox detail view."""
    return _build(
        image_field,
        [
            WATERMARK_OVERLAY,
            {'width': 1600, 'crop': 'limit', 'quality': 'auto', 'fetch_format': 'auto'},
        ],
    )


def admin_preview_url(image_field):
    """Unwatermarked thumbnail for the Editor-in-Chief's admin/draft review."""
    return _build(
        image_field,
        [{'width': 300, 'height': 300, 'crop': 'fill', 'quality': 'auto', 'fetch_format': 'auto'}],
    )
