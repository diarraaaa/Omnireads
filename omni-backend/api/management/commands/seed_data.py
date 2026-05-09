from django.core.management.base import BaseCommand
from api.models import Book, Profile, LibraryItem, Rating
import uuid
import random

class Command(BaseCommand):
    help = 'Seeds the database with high-quality "fake" books for local development.'

    def handle(self, *args, **kwargs):
        if not Book.objects.exists():
            books_data = [
                {
                    "title": "The Great Gatsby",
                    "author": "F. Scott Fitzgerald",
                    "genre": "Classic",
                    "description": "A story of ambition, love, and the American Dream in the Roaring Twenties.",
                    "cover_url": "https://covers.openlibrary.org/b/id/8432047-L.jpg",
                    "isbn": "9780743273565"
                },
                {
                    "title": "1984",
                    "author": "George Orwell",
                    "genre": "Dystopian",
                    "description": "A chilling look at a futuristic totalitarian society where Big Brother is always watching.",
                    "cover_url": "https://covers.openlibrary.org/b/id/12640516-L.jpg",
                    "isbn": "9780451524935"
                },
                {
                    "title": "The Hobbit",
                    "author": "J.R.R. Tolkien",
                    "genre": "Fantasy",
                    "description": "Bilbo Baggins, a hobbit, is whisked away into a quest to reclaim a stolen treasure.",
                    "cover_url": "https://covers.openlibrary.org/b/id/6979861-L.jpg",
                    "isbn": "9780547928227"
                },
                {
                    "title": "To Kill a Mockingbird",
                    "author": "Harper Lee",
                    "genre": "Fiction",
                    "description": "A profound look at racial injustice and the loss of innocence in the American South.",
                    "cover_url": "https://covers.openlibrary.org/b/id/8226191-L.jpg",
                    "isbn": "9780061120084"
                },
                {
                    "title": "Pride and Prejudice",
                    "author": "Jane Austen",
                    "genre": "Romance",
                    "description": "A sparkling comedy of manners and a timeless love story.",
                    "cover_url": "https://covers.openlibrary.org/b/id/12649033-L.jpg",
                    "isbn": "9780141439518"
                },
                {
                    "title": "Dune",
                    "author": "Frank Herbert",
                    "genre": "Sci-Fi",
                    "description": "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.",
                    "cover_url": "https://covers.openlibrary.org/b/id/10524410-L.jpg",
                    "isbn": "9780441172719"
                },
                {
                    "title": "The Catcher in the Rye",
                    "author": "J.D. Salinger",
                    "genre": "Classic",
                    "description": "The quintessential novel of teenage rebellion and angst.",
                    "cover_url": "https://covers.openlibrary.org/b/id/8225266-L.jpg",
                    "isbn": "9780316769174"
                },
                {
                    "title": "Brave New World",
                    "author": "Aldous Huxley",
                    "genre": "Dystopian",
                    "description": "A vision of a futuristic society based on pleasure and genetic engineering.",
                    "cover_url": "https://covers.openlibrary.org/b/id/12314545-L.jpg",
                    "isbn": "9780060850524"
                },
                {
                    "title": "The Alchemist",
                    "author": "Paulo Coelho",
                    "genre": "Adventure",
                    "description": "A fable about following your dreams and listening to your heart.",
                    "cover_url": "https://covers.openlibrary.org/b/id/14467000-L.jpg",
                    "isbn": "9780062315007"
                },
                {
                    "title": "Moby Dick",
                    "author": "Herman Melville",
                    "genre": "Adventure",
                    "description": "The obsessive quest of Captain Ahab for revenge on the white whale.",
                    "cover_url": "https://covers.openlibrary.org/b/id/12833075-L.jpg",
                    "isbn": "9780142437247"
                }
            ]

            for data in books_data:
                Book.objects.create(
                    id=uuid.uuid4(),
                    **data
                )
                self.stdout.write(self.style.SUCCESS(f'Successfully added "{data["title"]}"'))
            self.stdout.write(self.style.SUCCESS(f'Seed complete! Added {len(books_data)} books.'))
        else:
            self.stdout.write(self.style.WARNING('Database already has books. Skipping book seed.'))

        # Create Mock Profile if it doesn't exist
        mock_id = "00000000-0000-0000-0000-000000000000"
        if not Profile.objects.filter(id=mock_id).exists():
            try:
                Profile.objects.create(
                    id=mock_id,
                    username="local_dev",
                    name="Local Developer",
                    full_name="Omnireads Contributor",
                    bio="I'm helping build the sanctuary for readers!",
                    avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=dev"
                )
                self.stdout.write(self.style.SUCCESS('Created Mock Profile for local development.'))

                # Add some books to the library for this user
                all_books = list(Book.objects.all())
                if all_books:
                    sample_books = all_books[:3]
                    for book in sample_books:
                        # Add to library
                        LibraryItem.objects.get_or_create(
                            user_id=mock_id,
                            book=book,
                            defaults={'status': 'completed'}
                        )
                        # Add a rating
                        Rating.objects.get_or_create(
                            user_id=mock_id,
                            book=book,
                            defaults={'score': random.randint(4, 5)}
                        )
                    self.stdout.write(self.style.SUCCESS(f'Added {len(sample_books)} books to your personal library.'))

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Could not create mock profile or library items: {e}'))
                self.stdout.write(self.style.NOTICE('This is common if you are using a Supabase Postgres DB with strict foreign key constraints.'))
                self.stdout.write(self.style.NOTICE('For a true "Zero-Config" experience, try unsetting your DB_HOST to use the local SQLite fallback.'))
