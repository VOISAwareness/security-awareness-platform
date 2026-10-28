import React from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const TrainingPagination = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  return (
    <div className="training-pagination">
      <button
        type="button"
        className="pagination-arrow"
        onClick={() =>
          onPageChange(
            Math.max(1, currentPage - 1)
          )
        }
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="pagination-pages">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() =>
              onPageChange(page)
            }
            className={`pagination-page ${
              currentPage === page
                ? "active"
                : ""
            }`}
            aria-label={`Page ${page}`}
            aria-current={
              currentPage === page
                ? "page"
                : undefined
            }
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pagination-arrow"
        onClick={() =>
          onPageChange(
            Math.min(
              totalPages,
              currentPage + 1
            )
          )
        }
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default TrainingPagination;