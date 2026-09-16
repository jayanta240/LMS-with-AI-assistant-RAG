import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {title}
        </h1>

        <p className="mt-2 text-gray-500">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}