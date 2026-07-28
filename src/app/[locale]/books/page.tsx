import { getLocale } from 'next-intl/server';
import BooksScreen from '@/components/BooksScreen';
import { getBooks } from '@/lib/books';

export default async function BooksPage() {
  const locale = await getLocale();
  const books = await getBooks(locale);
  return <BooksScreen books={books} />;
}
