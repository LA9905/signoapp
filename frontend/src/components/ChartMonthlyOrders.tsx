// ChartMonthlyOrders.tsx
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale);

interface Props {
  dataPoints: number[];
}

const ChartMonthlyOrders: React.FC<Props> = ({ dataPoints }) => {
  if (dataPoints.length === 0) {
    return <p className="text-gray-600 text-sm">Aún no hay despachos registrados este mes.</p>;
  }

  const data = {
    labels: ["1", "5", "10", "15", "20", "25", "30"],
    datasets: [
      {
        label: "Despachos",
        data: dataPoints,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return <Bar data={data} options={options} />;
};

export default ChartMonthlyOrders;
