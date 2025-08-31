'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

// Repository configuration
const REPO_OWNER = 'henrik392';
const REPO_NAME = 'parti-chat';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export function GitHubButton() {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
          {
            next: { revalidate: 3600 }, // Cache for 1 hour
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStars(data.stargazers_count);
        }
      } catch {
        // Gracefully degrade to no star count
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  const formatStars = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <a
      className="group inline-flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02] hover:border-primary/20 hover:bg-muted/60 hover:shadow-md"
      href={REPO_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/20">
        <svg
          aria-hidden="true"
          className="h-4 w-4 fill-current transition-transform duration-200 group-hover:scale-110"
          viewBox="0 0 16 16"
        >
          <title>GitHub</title>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </div>
      <div className="flex-1 space-y-1">
        <p className="font-medium text-sm leading-none transition-colors duration-200 group-hover:text-primary">
          Se kildekoden
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed transition-colors duration-200 group-hover:text-foreground">
          Open source på GitHub
        </p>
      </div>
      {!loading && stars !== null && (
        <div className="flex items-center gap-1 text-muted-foreground transition-colors duration-200 group-hover:text-primary">
          <Star className="h-3 w-3 fill-current transition-transform duration-200 group-hover:scale-110" />
          <span className="font-medium text-xs">{formatStars(stars)}</span>
        </div>
      )}
    </a>
  );
}
