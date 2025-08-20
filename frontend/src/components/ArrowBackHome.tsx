import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

interface ArrowBackHomeProps {
  to?: string; // ruta opcional, por defecto /dashboard
}

const ArrowBackHome = ({ to = "/" }: ArrowBackHomeProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white border border-white/50 hover:bg-white/20 transition-colors"
      aria-label="Volver"
    >
      <FiArrowLeft size={20} />
    </button>
  );
};

export default ArrowBackHome;