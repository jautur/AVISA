package com.avisa.backend.auth;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {
    private static final Duration SESSION_LIFETIME = Duration.ofDays(7);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public AuthService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        Long userId;
        try {
            userId = jdbcTemplate.queryForObject("""
                    INSERT INTO usuarios (nombre, apellidos, email, password, telefono, direccion, tipo_usuario)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    RETURNING id_usuario
                    """, Long.class,
                    request.firstName().trim(),
                    request.lastName().trim(),
                    email,
                    passwordEncoder.encode(request.password()),
                    blankToNull(request.phone()),
                    blankToNull(request.address()),
                    request.accountType()
            );
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuenta con ese email");
        }

        AuthenticatedUser user = loadUser(userId);
        return createSession(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        List<AuthenticatedUser> users = jdbcTemplate.query("""
                SELECT id_usuario, nombre, apellidos, email, telefono, direccion, tipo_usuario, password
                FROM usuarios
                WHERE lower(email) = ?
                """, (result, row) -> {
                    String passwordHash = result.getString("password");
                    boolean matches;
                    try {
                        matches = passwordEncoder.matches(request.password(), passwordHash);
                    } catch (IllegalArgumentException exception) {
                        matches = false;
                    }
                    return matches ? new AuthenticatedUser(
                            result.getLong("id_usuario"), result.getString("nombre"),
                            result.getString("apellidos"), result.getString("email"),
                            result.getString("telefono"), result.getString("direccion"),
                            result.getString("tipo_usuario")
                    ) : null;
                }, email);
        AuthenticatedUser user = users.stream().filter(candidate -> candidate != null).findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Email o contraseña incorrectos"
                ));
        return createSession(user);
    }

    public Optional<AuthenticatedUser> authenticate(String token) {
        return jdbcTemplate.query("""
                SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.telefono, u.direccion, u.tipo_usuario
                FROM sesiones_usuario s
                JOIN usuarios u ON u.id_usuario = s.id_usuario
                WHERE s.token_hash = ? AND s.fecha_expiracion > CURRENT_TIMESTAMP
                """, (result, row) -> new AuthenticatedUser(
                result.getLong("id_usuario"), result.getString("nombre"), result.getString("apellidos"),
                result.getString("email"), result.getString("telefono"), result.getString("direccion"),
                result.getString("tipo_usuario")
        ), hashToken(token)).stream().findFirst();
    }

    public void logout(String token) {
        jdbcTemplate.update("DELETE FROM sesiones_usuario WHERE token_hash = ?", hashToken(token));
    }

    private AuthResponse createSession(AuthenticatedUser user) {
        jdbcTemplate.update("DELETE FROM sesiones_usuario WHERE fecha_expiracion <= CURRENT_TIMESTAMP");
        byte[] randomToken = new byte[32];
        SECURE_RANDOM.nextBytes(randomToken);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomToken);
        jdbcTemplate.update("""
                INSERT INTO sesiones_usuario (id_usuario, token_hash, fecha_expiracion)
                VALUES (?, ?, CURRENT_TIMESTAMP + (? * INTERVAL '1 second'))
                """, user.id(), hashToken(token), SESSION_LIFETIME.toSeconds());
        return new AuthResponse(token, user.toResponse());
    }

    private AuthenticatedUser loadUser(Long userId) {
        return jdbcTemplate.queryForObject("""
                SELECT id_usuario, nombre, apellidos, email, telefono, direccion, tipo_usuario
                FROM usuarios WHERE id_usuario = ?
                """, (result, row) -> new AuthenticatedUser(
                result.getLong("id_usuario"), result.getString("nombre"), result.getString("apellidos"),
                result.getString("email"), result.getString("telefono"), result.getString("direccion"),
                result.getString("tipo_usuario")
        ), userId);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
