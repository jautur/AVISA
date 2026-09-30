package com.avisa.backend.auth;

public record AuthResponse(String token, UserResponse user) {
}
