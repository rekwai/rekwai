interface PageStateWrapperProps {
  children: React.ReactNode;
}

function PageStateWrapper({ children }: PageStateWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">{children}</div>
    </div>
  );
}

interface PageStateProps {
  title: string;
  description: string;
}

export function PageLoadingState({ title, description }: PageStateProps) {
  return (
    <PageStateWrapper>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </PageStateWrapper>
  );
}

export function PageNotFoundState({ title, description }: PageStateProps) {
  return (
    <PageStateWrapper>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </PageStateWrapper>
  );
}

interface PageErrorStateProps {
  error: string;
}

export function PageErrorState({ error }: PageErrorStateProps) {
  return (
    <PageStateWrapper>
      <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
      <p className="text-gray-600">{error}</p>
    </PageStateWrapper>
  );
}
