interface Props {
  percentage: number;
}

export default function CourseProgress({
  percentage,
}: Props) {

  return (

    <div className="rounded-2xl bg-white p-6 shadow">

      <div className="mb-2 flex justify-between">

        <span className="font-medium">
          Progress
        </span>

        <span className="font-bold text-blue-600">
          {percentage}%
        </span>

      </div>

      <div className="h-3 rounded-full bg-gray-200">

        <div
          className="h-3 rounded-full bg-blue-600 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>

  );
}