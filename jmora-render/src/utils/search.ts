import type { Article, Exercise, MuscleGroup, Product } from '../types/jmora';

export interface SearchResults {
  muscles: MuscleGroup[];
  exercises: Exercise[];
  products: Product[];
  articles: Article[];
  totalCount: number;
}

function matchesQuery(q: string, ...fields: (string | undefined)[]): boolean {
  const normalized = q.trim().toLowerCase();
  if (!normalized) return false;
  return fields.some((f) => f && f.toLowerCase().includes(normalized));
}

export function performInstantSearch(
  query: string,
  catalog: {
    muscles: MuscleGroup[];
    exercises: Exercise[];
    products: Product[];
    articles: Article[];
  }
): SearchResults {
  const q = query.trim();
  if (!q) {
    return {
      muscles: [],
      exercises: [],
      products: [],
      articles: [],
      totalCount: 0,
    };
  }

  const muscles = catalog.muscles.filter((m) =>
    matchesQuery(q, m.name.fa, m.name.en, m.description.fa, m.description.en)
  );
  const exercises = catalog.exercises.filter((ex) =>
    matchesQuery(q, ex.name.fa, ex.name.en, ex.equipment, ex.level)
  );
  const products = catalog.products.filter((pr) =>
    matchesQuery(q, pr.name.fa, pr.name.en, pr.subtitle.fa, pr.subtitle.en, pr.category)
  );
  const articles = catalog.articles.filter((a) =>
    matchesQuery(
      q,
      a.title.fa,
      a.title.en,
      a.excerpt.fa,
      a.excerpt.en,
      ...a.tags.flatMap((t) => [t.fa, t.en])
    )
  );

  return {
    muscles: muscles.slice(0, 5),
    exercises: exercises.slice(0, 6),
    products: products.slice(0, 5),
    articles: articles.slice(0, 5),
    totalCount: muscles.length + exercises.length + products.length + articles.length,
  };
}
