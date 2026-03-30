function LoadingBlock({
  className,
}: Readonly<{
  className: string;
}>) {
  return <div className={`animate-pulse rounded-3xl bg-[#efe8da] ${className}`} />;
}

export default function ProtectedLoading() {
  return (
    <div className="min-h-screen bg-[#fcfaf6] px-3 pb-8 pt-3 sm:px-5 sm:pt-4 lg:px-8 lg:pt-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:gap-7">
        <div className="rounded-[1.2rem] border border-black/8 bg-white/82 px-3 py-3 shadow-[0_16px_40px_rgba(18,27,34,0.06)] backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <LoadingBlock className="h-10 w-40" />
              <LoadingBlock className="h-10 w-24" />
            </div>
            <LoadingBlock className="h-10 w-full" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LoadingBlock className="h-28 w-full" />
          <LoadingBlock className="h-28 w-full" />
          <LoadingBlock className="h-28 w-full" />
          <LoadingBlock className="h-28 w-full" />
        </div>

        <LoadingBlock className="h-[420px] w-full" />
      </div>
    </div>
  );
}
