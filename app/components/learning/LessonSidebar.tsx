interface Props {
  lessons: any[];
  selectedLesson: any;
  completedLessons: number[];
  courseId: number;
  onSelect: (lesson: any) => void;
}

export default function LessonSidebar({
  lessons,
  selectedLesson,
  completedLessons,
  courseId,
  onSelect,
}: Props) {

  return (

    <div className="rounded-2xl bg-white p-6 shadow">

      <h2 className="mb-6 text-2xl font-bold">
        Course Lessons
      </h2>

      <div className="space-y-3">

        {lessons.map((lesson) => {

          const completed =
            completedLessons.includes(lesson.id);

          const active =
            selectedLesson?.id === lesson.id;

          return (

            <button
              key={lesson.id}
              onClick={() => onSelect(lesson)}
              className={`w-full rounded-xl border p-4 text-left transition

                ${
                  active
                    ? "border-blue-600 bg-blue-50"
                    : completed
                    ? "border-green-500 bg-green-50"
                    : "hover:bg-gray-50"
                }

              `}
            >

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs text-gray-400">
                    Lesson {lesson.lesson_order}
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {lesson.title}
                  </h3>

                </div>

                <div className="text-2xl">

                  {completed ? "✅" : active ? "▶️" : "⭕"}

                </div>

              </div>

              <div className="mt-2">

                {completed ? (

                  <span className="text-sm font-medium text-green-600">
                    Completed
                  </span>

                ) : active ? (

                  <span className="text-sm font-medium text-blue-600">
                    Current Lesson
                  </span>

                ) : (

                  <span className="text-sm text-gray-400">
                    Not Started
                  </span>

                )}

              </div>

            </button>

          );

        })}

      </div>

    </div>

  );

}