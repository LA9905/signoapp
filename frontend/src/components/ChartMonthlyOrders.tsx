// import { Bar } from "react-chartjs-2";
// import "chart.js/auto";

// interface Props {
//   dataPoints: number[];
// }

// const ChartMonthlyOrders: React.FC<Props> = ({ dataPoints }) => {
//   if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
//     return <p className="text-gray-600 text-sm">Aún no hay despachos registrados este mes.</p>;
//   }

//   const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
//   // Si por alguna razón vienen menos de 31, rellenamos para evitar desalineación
//   const dataSafe =
//     dataPoints.length === 31 ? dataPoints : [...dataPoints, ...Array(Math.max(0, 31 - dataPoints.length)).fill(0)];

//   const data = {
//     labels,
//     datasets: [
//       {
//         label: "Despachos",
//         data: dataSafe,
//         backgroundColor: "rgba(59, 130, 246, 0.6)",
//         hoverBackgroundColor: "rgba(37, 99, 235, 0.85)",
//         borderRadius: 8,
//         borderSkipped: false,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     maintainAspectRatio: false as const,
//     plugins: {
//       legend: { display: false },
//       tooltip: {
//         backgroundColor: "rgba(15, 23, 42, 0.85)",
//         titleColor: "#94a3b8",
//         bodyColor: "#f1f5f9",
//         padding: 10,
//         cornerRadius: 8,
//       },
//     },
//     scales: {
//       x: {
//         grid: { display: false },
//         ticks: { color: "#94a3b8", font: { size: 11 } },
//       },
//       y: {
//         beginAtZero: true,
//         ticks: { stepSize: 1, color: "#94a3b8", font: { size: 11 } },
//         grid: { color: "rgba(148, 163, 184, 0.15)" },
//       },
//     },
//   };

//   return (
//     <div style={{ height: 280 }}>
//       <Bar data={data} options={options} />
//     </div>
//   );
// };

// export default ChartMonthlyOrders;


import { Bar } from "react-chartjs-2";
import "chart.js/auto";

interface Props {
  dataPoints: number[];
}

const ChartMonthlyOrders: React.FC<Props> = ({ dataPoints }) => {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return (
      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>
        Aún no hay despachos registrados este mes.
      </p>
    );
  }

  const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const dataSafe =
    dataPoints.length === 31 ? dataPoints : [...dataPoints, ...Array(Math.max(0, 31 - dataPoints.length)).fill(0)];

  const data = {
    labels,
    datasets: [
      {
        label: "Despachos",
        data: dataSafe,
        backgroundColor: "rgba(99,102,241,0.45)",
        hoverBackgroundColor: "rgba(99,102,241,0.8)",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(8,12,20,0.95)",
        titleColor: "rgba(255,255,255,0.4)",
        bodyColor: "#A5B4FC",
        padding: 10,
        cornerRadius: 10,
        borderColor: "rgba(99,102,241,0.25)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "rgba(255,255,255,0.2)",
          font: { size: 10, family: "'DM Sans', sans-serif" },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: {
          stepSize: 1,
          color: "rgba(255,255,255,0.2)",
          font: { size: 10, family: "'DM Sans', sans-serif" },
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ChartMonthlyOrders;