package com.avisa.backend.service;

import com.avisa.backend.dto.CategoryResponse;
import com.avisa.backend.dto.ListingCreateRequest;
import com.avisa.backend.dto.ListingResponse;
import com.avisa.backend.dto.ListingUpdateRequest;
import com.avisa.backend.auth.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ListingService {
    private static final String LISTINGS_SQL = """
            SELECT id, kind, category_id, title, category, summary, location, priority, price,
                   created_by, status, featured
            FROM (
                SELECT 'T-' || t.id_trabajo AS id,
                       'needs' AS kind,
                       t.id_categoria AS category_id,
                       t.id_usuario AS owner_id,
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
                       o.id_categoria AS category_id,
                       o.id_profesional AS owner_id,
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
            WHERE (?::bigint IS NULL OR owner_id = ?)
            ORDER BY created_at DESC
            """;

    private static final RowMapper<ListingResponse> LISTING_ROW_MAPPER = (result, rowNumber) ->
            new ListingResponse(
                    result.getString("id"),
                    result.getString("kind"),
                    result.getLong("category_id"),
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

    public ListingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ListingResponse> findAll() {
        return jdbcTemplate.query(LISTINGS_SQL, LISTING_ROW_MAPPER, null, null)
                .stream()
                .filter(this::isPubliclyVisible)
                .toList();
    }

    public List<ListingResponse> findForUser(AuthenticatedUser user) {
        return jdbcTemplate.query(LISTINGS_SQL, LISTING_ROW_MAPPER, user.id(), user.id());
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
    public ListingResponse create(ListingCreateRequest request, AuthenticatedUser user) {
        if (request.kind().equals("offers") && (request.price() == null || request.price() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica un precio mayor que cero para la oferta");
        }

        String userType = request.kind().equals("offers") ? "profesional" : "cliente";
        String currentType = user.accountType();
        String nextUserType = currentType.equals(userType) || currentType.equals("ambos") ? currentType : "ambos";
        jdbcTemplate.update("UPDATE usuarios SET tipo_usuario = ? WHERE id_usuario = ?", nextUserType, user.id());

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
                    user.id(),
                    request.categoryId(),
                    request.title().trim(),
                    request.summary().trim(),
                    request.price(),
                    request.location().trim()
            );
            return new ListingResponse("O-" + offerId, "offers", request.categoryId(), request.title().trim(), categoryName,
                    request.summary().trim(), request.location().trim(), "MEDIA", request.price(),
                    user.fullName(), "activo", false);
        }

        Long jobId = jdbcTemplate.queryForObject("""
                INSERT INTO trabajos (id_usuario, id_categoria, titulo, descripcion, direccion)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id_trabajo
                """, Long.class,
                user.id(),
                request.categoryId(),
                request.title().trim(),
                request.summary().trim(),
                request.location().trim()
        );
        return new ListingResponse("T-" + jobId, "needs", request.categoryId(), request.title().trim(), categoryName,
                request.summary().trim(), request.location().trim(), "MEDIA", null,
                user.fullName(), "pendiente", false);
    }

    @Transactional
    public ListingResponse update(String id, ListingUpdateRequest request, AuthenticatedUser user) {
        ListingRef ref = parseId(id);
        if (ref.kind().equals("offers") && (request.price() == null || request.price() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica un precio mayor que cero para la oferta");
        }

        requireCategory(request.categoryId());
        int updated;
        if (ref.kind().equals("offers")) {
            updated = jdbcTemplate.update("""
                    UPDATE ofertas
                    SET id_categoria = ?, titulo = ?, descripcion = ?, precio = ?, ubicacion = ?
                    WHERE id_oferta = ? AND id_profesional = ?
                    """, request.categoryId(), request.title().trim(), request.summary().trim(),
                    request.price(), request.location().trim(), ref.id(), user.id());
        } else {
            updated = jdbcTemplate.update("""
                    UPDATE trabajos
                    SET id_categoria = ?, titulo = ?, descripcion = ?, direccion = ?
                    WHERE id_trabajo = ? AND id_usuario = ?
                    """, request.categoryId(), request.title().trim(), request.summary().trim(),
                    request.location().trim(), ref.id(), user.id());
        }
        requireOwnedListing(updated);
        return findForUser(user).stream()
                .filter(listing -> listing.id().equalsIgnoreCase(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada"));
    }

    @Transactional
    public ListingResponse updateStatus(String id, String nextStatus, AuthenticatedUser user) {
        ListingRef ref = parseId(id);
        String table = ref.kind().equals("offers") ? "ofertas" : "trabajos";
        String idColumn = ref.kind().equals("offers") ? "id_oferta" : "id_trabajo";
        String ownerColumn = ref.kind().equals("offers") ? "id_profesional" : "id_usuario";
        String currentStatus = jdbcTemplate.query(
                "SELECT estado FROM " + table + " WHERE " + idColumn + " = ? AND " + ownerColumn + " = ?",
                result -> result.next() ? result.getString(1) : null, ref.id(), user.id());
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada");
        }
        if (!isAllowedTransition(ref.kind(), currentStatus, nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ese cambio de estado no está permitido");
        }
        jdbcTemplate.update("UPDATE " + table + " SET estado = ? WHERE " + idColumn + " = ? AND " + ownerColumn + " = ?",
                nextStatus, ref.id(), user.id());
        return findForUser(user).stream()
                .filter(listing -> listing.id().equalsIgnoreCase(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada"));
    }

    @Transactional
    public void delete(String id, AuthenticatedUser user) {
        ListingRef ref = parseId(id);
        String table = ref.kind().equals("offers") ? "ofertas" : "trabajos";
        String idColumn = ref.kind().equals("offers") ? "id_oferta" : "id_trabajo";
        String ownerColumn = ref.kind().equals("offers") ? "id_profesional" : "id_usuario";
        int deleted = jdbcTemplate.update("DELETE FROM " + table + " WHERE " + idColumn + " = ? AND " + ownerColumn + " = ?",
                ref.id(), user.id());
        requireOwnedListing(deleted);
    }

    private void requireCategory(Long categoryId) {
        try {
            jdbcTemplate.queryForObject("SELECT id_categoria FROM categorias WHERE id_categoria = ?",
                    Long.class, categoryId);
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La categoría seleccionada no existe");
        }
    }

    private void requireOwnedListing(int affectedRows) {
        if (affectedRows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada");
        }
    }

    private ListingRef parseId(String id) {
        if (id == null || !id.matches("(?i)[TO]-[1-9][0-9]*")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada");
        }
        try {
            return new ListingRef(id.substring(0, 1).equalsIgnoreCase("O") ? "offers" : "needs",
                    Long.parseLong(id.substring(2)));
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicación no encontrada");
        }
    }

    private boolean isPubliclyVisible(ListingResponse listing) {
        return listing.kind().equals("offers")
                ? listing.status().equals("activo")
                : listing.status().equals("pendiente") || listing.status().equals("en_proceso");
    }

    private boolean isAllowedTransition(String kind, String current, String next) {
        if (kind.equals("offers")) {
            return (current.equals("activo") && (next.equals("pausado") || next.equals("inactivo")))
                    || ((current.equals("pausado") || current.equals("inactivo")) && next.equals("activo"));
        }
        return (current.equals("pendiente") && (next.equals("en_proceso") || next.equals("cancelado")))
                || (current.equals("en_proceso") && (next.equals("completado") || next.equals("cancelado")));
    }

    private record ListingRef(String kind, long id) {
    }
}
