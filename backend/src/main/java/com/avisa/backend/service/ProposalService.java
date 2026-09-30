package com.avisa.backend.service;

import com.avisa.backend.auth.AuthenticatedUser;
import com.avisa.backend.dto.ProposalCreateRequest;
import com.avisa.backend.dto.ProposalResponse;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProposalService {
    private static final String PROPOSAL_SELECT = """
            SELECT p.id_propuesta AS id,
                   'T-' || t.id_trabajo AS listing_id,
                   t.titulo AS listing_title,
                   concat_ws(' ', u.nombre, u.apellidos) AS professional_name,
                   p.precio_propuesto AS amount,
                   p.mensaje AS message,
                   p.estado AS status
            FROM propuestas p
            JOIN trabajos t ON t.id_trabajo = p.id_trabajo
            JOIN usuarios u ON u.id_usuario = p.id_profesional
            """;

    private final JdbcTemplate jdbcTemplate;

    public ProposalService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ProposalResponse create(String listingId, ProposalCreateRequest request, AuthenticatedUser user) {
        if (user.accountType().equals("cliente")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Necesitas una cuenta profesional para enviar propuestas");
        }

        long jobId = parseJobId(listingId);
        JobOwner job = findJob(jobId);
        if (job.ownerId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes responder a tu propia necesidad");
        }
        if (!job.status().equals("pendiente")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta necesidad ya no acepta propuestas");
        }

        Long proposalId;
        try {
            proposalId = jdbcTemplate.queryForObject("""
                    INSERT INTO propuestas (id_trabajo, id_profesional, mensaje, precio_propuesto)
                    VALUES (?, ?, ?, ?)
                    RETURNING id_propuesta
                    """, Long.class, jobId, user.id(), request.message().trim(), request.amount());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tienes una propuesta pendiente para esta necesidad");
        }
        return jdbcTemplate.queryForObject(PROPOSAL_SELECT + " WHERE p.id_propuesta = ?",
                PROPOSAL_ROW_MAPPER, proposalId);
    }

    public List<ProposalResponse> findForJob(String listingId, AuthenticatedUser user) {
        long jobId = parseJobId(listingId);
        Integer ownsJob = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM trabajos WHERE id_trabajo = ? AND id_usuario = ?",
                Integer.class, jobId, user.id());
        if (ownsJob == null || ownsJob == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Necesidad no encontrada");
        }
        return jdbcTemplate.query(PROPOSAL_SELECT + " WHERE p.id_trabajo = ? ORDER BY p.fecha_propuesta DESC",
                PROPOSAL_ROW_MAPPER, jobId);
    }

    public List<ProposalResponse> findForProfessional(AuthenticatedUser user) {
        return jdbcTemplate.query(PROPOSAL_SELECT + " WHERE p.id_profesional = ? ORDER BY p.fecha_propuesta DESC",
                PROPOSAL_ROW_MAPPER, user.id());
    }

    @Transactional
    public ProposalResponse updateStatus(long proposalId, String nextStatus, AuthenticatedUser user) {
        ProposalRow proposal;
        try {
            proposal = jdbcTemplate.queryForObject("""
                    SELECT p.id_propuesta, p.id_trabajo, p.estado, t.estado AS job_status
                    FROM propuestas p
                    JOIN trabajos t ON t.id_trabajo = p.id_trabajo
                    WHERE p.id_propuesta = ? AND t.id_usuario = ?
                    FOR UPDATE OF p, t
                    """, (result, row) -> new ProposalRow(
                    result.getLong("id_propuesta"), result.getLong("id_trabajo"),
                    result.getString("estado"), result.getString("job_status")
            ), proposalId, user.id());
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Propuesta no encontrada");
        }

        if (!proposal.status().equals("pendiente")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta propuesta ya ha sido revisada");
        }
        if (!proposal.jobStatus().equals("pendiente")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La necesidad ya no está disponible");
        }

        jdbcTemplate.update("UPDATE propuestas SET estado = ? WHERE id_propuesta = ?",
                nextStatus, proposal.id());
        if (nextStatus.equals("aceptada")) {
            jdbcTemplate.update("UPDATE trabajos SET estado = 'en_proceso' WHERE id_trabajo = ?",
                    proposal.jobId());
            jdbcTemplate.update("""
                    UPDATE propuestas SET estado = 'rechazada'
                    WHERE id_trabajo = ? AND id_propuesta <> ? AND estado = 'pendiente'
                    """, proposal.jobId(), proposal.id());
        }

        return jdbcTemplate.queryForObject(PROPOSAL_SELECT + " WHERE p.id_propuesta = ?",
                PROPOSAL_ROW_MAPPER, proposal.id());
    }

    private JobOwner findJob(long jobId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT id_usuario, estado FROM trabajos WHERE id_trabajo = ? FOR UPDATE
                    """, (result, row) -> new JobOwner(result.getLong("id_usuario"), result.getString("estado")), jobId);
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Necesidad no encontrada");
        }
    }

    private long parseJobId(String listingId) {
        if (listingId == null || !listingId.matches("(?i)T-[1-9][0-9]*")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Necesidad no encontrada");
        }
        try {
            return Long.parseLong(listingId.substring(2));
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Necesidad no encontrada");
        }
    }

    private static final org.springframework.jdbc.core.RowMapper<ProposalResponse> PROPOSAL_ROW_MAPPER =
            (result, row) -> new ProposalResponse(
                    result.getLong("id"), result.getString("listing_id"), result.getString("listing_title"),
                    result.getString("professional_name"), result.getDouble("amount"),
                    result.getString("message"), result.getString("status")
            );

    private record JobOwner(Long ownerId, String status) {
    }

    private record ProposalRow(Long id, Long jobId, String status, String jobStatus) {
    }
}
