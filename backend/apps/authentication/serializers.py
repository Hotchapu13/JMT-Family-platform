from rest_framework import serializers


class ValidateCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=128)


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, trim_whitespace=False)


class GenerateAccessCodeSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    expires_in_days = serializers.IntegerField(min_value=1, default=30)


class AccessCodeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField()
