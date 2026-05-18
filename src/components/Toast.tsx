export const Toast = ({ toast, setToast }: { toast: any; setToast: any }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md px-4 py-3 shadow-lg text-white text-sm max-w-sm bg-opacity-90">
      <div
        className={
          "absolute inset-0 -z-10 rounded-md " +
          (toast.type === "error"
            ? "bg-red-600"
            : toast.type === "success"
              ? "bg-green-600"
              : "bg-gray-800")
        }
      />
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => setToast(null)}
        className="ml-auto text-white/80 hover:text-white text-lg leading-none"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};
