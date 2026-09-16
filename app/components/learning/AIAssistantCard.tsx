import Link from "next/link";

interface Props {
  lessonTitle?: string;
}

export default function AIAssistantCard({
  lessonTitle,
}: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">

      <h2 className="text-3xl font-bold">
        🤖 AI Learning Assistant
      </h2>

      <p className="mt-3 text-blue-100">
        {lessonTitle
          ? `Need help with "${lessonTitle}"? Ask the AI for explanations, summaries, or examples.`
          : "Ask questions about this course anytime."}
      </p>

      <Link
        href="/assistant"
        className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-gray-100"
      >
        Open AI Assistant
      </Link>

    </div>
  );
}