package com.avisa.backend.service;

import com.avisa.backend.dto.CategoryResponse;
import com.avisa.backend.dto.ListingCreateRequest;
import com.avisa.backend.dto.ListingResponse;
import org.springframework.http.HttpStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class ListingService {
    private static final String LISTINGS_SQL = """
            SELECT id, kind, title, category, summary, location, priority, price,
                   created_by, status, featured
            FROM (
                SELECT 'T-' || t.id_trabajo AS id,
                       'needs' AS kind,
                       t.titulo AS title,
                       c.nombre AS category,
                       t.descripcion AS summary,
                       t.direccion AS location,
                       'MEDIA' AS priority,
                       NULL::numeric AS price,
                       concat_ws(' ', u.nombre, u.apellidos) AS created_by,
                       t.estado AS status,
                       FALSE AS featured,
                       t.fecha_creacion AS created_at
                FROM trabajos t
                JOIN usuarios u ON u.id_usuario = t.id_usuario
                JOIN categorias c ON c.id_categoria = t.id_categoria
                UNION ALL
                SELECT 'O-' || o.id_oferta AS id,
                       'offers' AS kind,
                       o.titulo AS title,
                       c.nombre AS category,
                       o.descripcion AS summary,
                       o.ubicacion AS location,
                       'MEDIA' AS priority,
                       o.precio AS price,
                       concat_ws(' ', u.nombre, u.apellidos) AS created_by,
                       o.estado AS status,
                       FALSE AS featured,
                       o.fecha_publicacion AS created_at
                FROM ofertas o
                JOIN usuarios u ON u.id_usuario = o.id_profesional
                JOIN categorias c ON c.id_categoria = o.id_categoria
            ) listings
            ORDER BY created_at DESC
            """;

    private static final RowMapper<ListingResponse> LISTING_ROW_MAPPER = (result, rowNumber) ->
            new ListingResponse(
                    result.getString("id"),
                    result.getString("kind"),
                    result.getString("title"),
                    result.getString("category"),
                    result.getString("summary"),
                    result.getString("location"),
                    result.getString("priority"),
                    result.getObject("price") == null ? null : result.getDouble("price"),
                    result.getString("created_by"),
                    result.getString("status"),
                    result.getBoolean("featured")
            );

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ListingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ListingResponse> findAll() {
        return jdbcTemplate.query(LISTINGS_SQL, LISTING_ROW_MAPPER);
    }

    public ListingResponse findById(String id) {
        return findAll().stream()
                .filter(listing -> listing.id().equalsIgnoreCase(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada"));
    }

    public List<CategoryResponse> findCategories() {
        return jdbcTemplate.query(
                "SELECT id_categoria, nombre FROM categorias ORDER BY nombre",
                (result, rowNumber) -> new CategoryResponse(
                        result.getLong("id_categoria"),
                        result.getString("nombre")
                )
        );
    }

    @Transactional
    public ListingResponse create(ListingCreateRequest request) {
        if (request.kind().equals("offers") && (request.price() == null || request.price() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica un precio mayor que cero para la oferta");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String userType = request.kind().equals("offers") ? "profesional" : "cliente";

        List<StoredUser> existingUsers = jdbcTemplate.query(
                "SELECT id_usuario, password, tipo_usuario FROM usuarios WHERE lower(email) = ?",
                (result, rowNumber) -> new StoredUser(
                        result.getLong("id_usuario"),
                        result.getString("password"),
                        result.getString("tipo_usuario")
                ),
                email
        );

        Long userId;
        if (!existingUsers.isEmpty()) {
            StoredUser existingUser = existingUsers.get(0);
            boolean passwordMatches;
            try {
                passwordMatches = passwordEncoder.matches(request.password(), existingUser.passwordHash());
            } catch (IllegalArgumentException exception) {
                passwordMatches = false;
            }
            if (!passwordMatches) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email o contraseña incorrectos");
            }
            userId = existingUser.id();
            String nextUserType = existingUser.type().equals(userType) || existingUser.type().equals("ambos")
                    ? existingUser.type()
                    : "ambos";
            jdbcTemplate.update("""
                    UPDATE usuarios
                    SET nombre = ?, apellidos = ?, telefono = ?, direccion = ?, tipo_usuario = ?
                    WHERE id_usuario = ?
                    """,
                    request.firstName().trim(),
                    request.lastName().trim(),
                    blankToNull(request.phone()),
                    blankToNull(request.address()),
                    nextUserType,
                    userId
            );
        } else {
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
                    userType
            );
        }

        String categoryName;
        try {
            categoryName = jdbcTemplate.queryForObject(
                    "SELECT nombre FROM categorias WHERE id_categoria = ?",
                    String.class,
                    request.categoryId()
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La categoría seleccionada no existe");
        }

        if (request.kind().equals("offers")) {
            Long offerId = jdbcTemplate.queryForObject("""
                    INSERT INTO ofertas (id_profesional, id_categoria, titulo, descripcion, precio, ubicacion)
                    VALUES (?, ?, ?, ?, ?, ?)
                    RETURNING id_oferta
                    """, Long.class,
                    userId,
                    request.categoryId(),
                    request.title().trim(),
                    request.summary().trim(),
                    request.price(),
                    request.location().trim()
            );
            return new ListingResponse("O-" + offerId, "offers", request.title().trim(), categoryName,
                    request.summary().trim(), request.location().trim(), "MEDIA", request.price(),
                    request.firstName().trim() + " " + request.lastName().trim(), "activo", false);
        }

        Long jobId = jdbcTemplate.queryForObject("""
                INSERT INTO trabajos (id_usuario, id_categoria, titulo, descripcion, direccion)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id_trabajo
                """, Long.class,
                userId,
                request.categoryId(),
                request.title().trim(),
                request.summary().trim(),
                request.location().trim()
        );
        return new ListingResponse("T-" + jobId, "needs", request.title().trim(), categoryName,
                request.summary().trim(), request.location().trim(), "MEDIA", null,
                request.firstName().trim() + " " + request.lastName().trim(), "pendiente", false);
    }

    private record StoredUser(Long id, String passwordHash, String type) {
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
