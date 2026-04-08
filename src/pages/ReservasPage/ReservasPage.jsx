import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiCalendar, FiClock, FiUsers, FiMapPin } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { getMisReservas, cancelarReserva } from "../../services/reservasService";
import { obtenerMetadatosEspacios } from "../../services/espaciosBackendService";
import { colorIconPorCategoria } from "../../utils/coloresEspacio";
import unizarLogo from "../../assets/images/unizar.png";
import "./ReservasPage.css";

const ESTADO_COLORES = {
  aceptada:   { bg: "#dcfce7", text: "#166534", label: "Activa" },
  cancelada:  { bg: "#fee2e2", text: "#991b1b", label: "Cancelada" },
  finalizada: { bg: "#f3f4f6", text: "#6b7280", label: "Finalizada" },
  rechazada:  { bg: "#fef3c7", text: "#92400e", label: "Rechazada" },
};

const FILTROS = ["todas", "aceptada", "cancelada", "finalizada"];

export default function ReservasPage() {
  const navigate            = useNavigate();
  const { usuario, logout } = useAuth();
  const [reservas,   setReservas]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [filtro,     setFiltro]     = useState("todas");
  const [cancelando, setCancelando] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true);
        const [data, metadatos] = await Promise.all([
          getMisReservas(),
          obtenerMetadatosEspacios(),
        ]);

        // Índice de metadatos por gid para búsqueda rápida
        const metadatosPorGid = {};
        for (const m of metadatos) {
          metadatosPorGid[Number(m.gid)] = m;
        }

        // Enriquecer cada reserva con los nombres de sus espacios
        const reservasEnriquecidas = data.map((r) => {
          const espaciosEnriquecidos = (r.espacios || []).map((e) => {
            const meta = metadatosPorGid[Number(e.espacioId)];
            return {
              ...e,
              nombre:    meta?.nombre    ?? `Espacio #${e.espacioId}`,
              categoria: meta?.categoria ?? null,
              planta:    meta?.planta    ?? null,
            };
          });

          // Categoría principal para el icono — la del primer espacio
          const categoriaIcono = espaciosEnriquecidos[0]?.categoria ?? null;

          return {
            ...r,
            espaciosEnriquecidos,
            categoriaIcono,
          };
        });

        setReservas(reservasEnriquecidas);
      } catch (err) {
        setError(err.message || "Error cargando reservas");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const handleCancelar = async (reservaId) => {
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    setCancelando(reservaId);
    try {
      await cancelarReserva(reservaId);
      setReservas((prev) =>
        prev.map((r) => r.id === reservaId ? { ...r, estado: "cancelada" } : r)
      );
    } catch (err) {
      alert(err.message || "Error cancelando la reserva");
    } finally {
      setCancelando(null);
    }
  };

  const reservasFiltradas = filtro === "todas"
    ? reservas
    : reservas.filter((r) => r.estado === filtro);

  const contadores = {
    aceptada:   reservas.filter((r) => r.estado === "aceptada").length,
    cancelada:  reservas.filter((r) => r.estado === "cancelada").length,
    finalizada: reservas.filter((r) => r.estado === "finalizada").length,
  };

  return (
    <div className="reservas-root">
      <header className="reservas-topbar">
        <div className="reservas-topbar-left">
          <img src={unizarLogo} alt="Universidad Zaragoza" className="reservas-logo-img" />
          <div>
            <h1 className="reservas-app-title">ByronSpace</h1>
            <p className="reservas-app-subtitle">Sistema de Reservas · Ada Byron</p>
          </div>
        </div>
        <div className="reservas-topbar-right">
          <button className="reservas-topbar-link" onClick={() => navigate("/")}>
            Volver al mapa
          </button>
          <div className="reservas-user-info">
            <div className="reservas-user-details">
              <div className="reservas-user-name">{usuario?.nombre || "Usuario"}</div>
              <div className="reservas-user-role">{usuario?.rol || "Sin rol"}</div>
            </div>
            <div className="reservas-user-circle">
              {(usuario?.nombre || "U").charAt(0).toUpperCase()}
            </div>
          </div>
          <button
            className="reservas-topbar-logout"
            onClick={() => { logout(); navigate("/login"); }}
            title="Cerrar sesión"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </header>

      <main className="reservas-main">
        <div className="reservas-header">
          <h2 className="reservas-title">Mis Reservas</h2>
          <p className="reservas-subtitle">Gestiona y consulta todas tus reservas de espacios</p>
        </div>

        <div className="reservas-contadores">
          {[
            { label: "Activas",     count: contadores.aceptada,  color: "#16a34a" },
            { label: "Finalizadas", count: contadores.finalizada, color: "#6b7280" },
            { label: "Canceladas",  count: contadores.cancelada,  color: "#dc2626" },
          ].map(({ label, count, color }) => (
            <div key={label} className="reservas-contador-card">
              <p className="reservas-contador-num" style={{ color }}>{count}</p>
              <p className="reservas-contador-label">{label}</p>
            </div>
          ))}
        </div>

        <div className="reservas-filtros">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`reservas-filtro-btn${filtro === f ? " reservas-filtro-btn--active" : ""}`}
            >
              {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading && <div className="reservas-loading">Cargando reservas...</div>}
        {error   && <div className="reservas-error">{error}</div>}

        {!loading && !error && reservasFiltradas.length === 0 && (
          <div className="reservas-empty">
            No tienes reservas{filtro !== "todas" ? ` con estado "${filtro}"` : ""}.
          </div>
        )}

        <div className="reservas-list">
          {reservasFiltradas.map((reserva) => {
            const estadoInfo  = ESTADO_COLORES[reserva.estado] || { bg: "#f3f4f6", text: "#6b7280", label: reserva.estado };
            const colorIcon   = colorIconPorCategoria(reserva.categoriaIcono);
            const espacios    = reserva.espaciosEnriquecidos || [];
            const nombreLabel = espacios.length === 1
              ? espacios[0].nombre
              : `${espacios[0]?.nombre || "Espacio"} +${espacios.length - 1} más`;

            // Total personas de todos los espacios
            const totalPersonas = espacios.reduce((acc, e) => acc + (e.numPersonas || 0), 0);

            return (
              <div key={reserva.id} className="reservas-item-card">
                <div className="reservas-item-left">
                  <div className="reservas-item-icon" style={{ background: colorIcon.bg, color: colorIcon.text }}>
                    <FiMapPin size={18} />
                  </div>
                  <div className="reservas-item-info">
                    <p className="reservas-item-nombre">{nombreLabel}</p>

                    {/* Si hay varios espacios, mostrarlos como píldoras */}
                    {espacios.length > 1 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                        {espacios.map((e, idx) => (
                          <span key={idx} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 999,
                            background: "#eff6ff", color: "#1d4ed8", fontWeight: 500,
                          }}>
                            {e.nombre}{e.numPersonas ? ` (${e.numPersonas}p)` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="reservas-item-meta">
                      <span className="reservas-item-meta-item">
                        <FiCalendar size={12} /> {reserva.fecha}
                      </span>
                      <span className="reservas-item-meta-item">
                        <FiClock size={12} /> {reserva.horaInicio} — {reserva.horaFin}
                      </span>
                      {totalPersonas > 0 && (
                        <span className="reservas-item-meta-item">
                          <FiUsers size={12} /> {totalPersonas} personas
                        </span>
                      )}
                      {reserva.tipoUso && (
                        <span className="reservas-item-meta-item" style={{ textTransform: "capitalize" }}>
                          {reserva.tipoUso}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="reservas-item-right">
                  <span
                    className="reservas-item-badge"
                    style={{ background: estadoInfo.bg, color: estadoInfo.text }}
                  >
                    {estadoInfo.label}
                  </span>
                  {reserva.estado === "aceptada" && (
                    <button
                      className="reservas-item-cancelar"
                      onClick={() => handleCancelar(reserva.id)}
                      disabled={cancelando === reserva.id}
                    >
                      {cancelando === reserva.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}