import hashlib
import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class AdminUser(AbstractUser):
    """The Editor-in-Chief, and any future co-administrators.

    Kept entirely separate from the Family Viewer flow below — viewers
    never get a row in this table at all, they only ever hold a viewer-
    scoped JWT tied to an AccessCode.
    """

    class Meta:
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'

    def __str__(self):
        return self.get_full_name() or self.username


class AccessCode(models.Model):
    """A shareable code that grants Family Viewers temporary read access.

    The plaintext code is generated once (in `generate()`) and handed back
    to the admin who created it — only its SHA-256 hash is ever persisted,
    so the plaintext cannot be recovered from the database afterward.
    """

    code_hash = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        AdminUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='access_codes',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Access Code'
        verbose_name_plural = 'Access Codes'

    def __str__(self):
        return self.label or f'Access Code #{self.pk}'

    def is_valid(self):
        return self.is_active and self.expires_at > timezone.now()

    @staticmethod
    def hash_code(plaintext_code):
        return hashlib.sha256(plaintext_code.encode('utf-8')).hexdigest()

    @classmethod
    def generate(cls, created_by, expires_at, label=''):
        """Create a new AccessCode and return `(instance, plaintext_code)`.

        The plaintext is only ever available here, at creation time.
        """
        plaintext_code = secrets.token_urlsafe(9)
        instance = cls.objects.create(
            code_hash=cls.hash_code(plaintext_code),
            expires_at=expires_at,
            created_by=created_by,
            label=label,
        )
        return instance, plaintext_code
