interface CourseHeaderProps {
  title: string;
  description: string;
}

export default function CourseHeader({
  title,
  description,
}: CourseHeaderProps) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">

      <h1 className="text-4xl font-bold text-gray-900">
        📘 {title}
      </h1>

      <p className="mt-3 text-gray-500">
        {description}
      </p>

    </div>
  );
}