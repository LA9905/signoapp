import { Bar } from "react-chartjs-2";
import "chart.js/auto";

interface Props {
  dataPoints: number[];
}

const ChartMonthlyOrders: React.FC<Props> = ({ dataPoints }) => {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return <p className="text-gray-600 text-sm">Aún no hay despachos registrados este mes.</p>;
  }

  const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  // Si por alguna razón vienen menos de 31, rellenamos para evitar desalineación
  const dataSafe =
    dataPoints.length === 31 ? dataPoints : [...dataPoints, ...Array(Math.max(0, 31 - dataPoints.length)).fill(0)];

  const data = {
    labels,
    datasets: [
      {
        label: "Despachos",
        data: dataSafe,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const, // para que se adapte mejor al contenedor
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div style={{ height: 300 }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ChartMonthlyOrders;