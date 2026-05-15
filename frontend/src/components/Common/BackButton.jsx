import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const BackButton = ({ to = -1, className = "" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to === -1) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all ${className}`}
    >
      <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
      Back
    </button>
  );
};

export default BackButton;
