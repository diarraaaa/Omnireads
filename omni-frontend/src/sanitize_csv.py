import csv
import os
import sys

# Increase max field size just in case there are huge descriptions
csv.field_size_limit(sys.maxsize)

def fix_text(text):
    if not text:
        return text
    
    # fix mojibake
    try:
        # Check if it looks like mojibake first
        if 'Ã' in text or 'â€' in text:
            text = text.encode('windows-1252').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass # If we can't decode it, we fall back to manual replacements
        replacements = {
            'Ã©': 'é', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã\xad': 'í', 'Ãº': 'ú', 'Ã±': 'ñ',
            'Ã¼': 'ü', 'Ã¶': 'ö', 'Ã¤': 'ä', 'ÃŸ': 'ß', 'Ã§': 'ç', 'Ã¨': 'è',
            'â€™': "'", 'â€œ': '"', 'â€\x9d': '"', 'â€”': '--', 'â€“': '-',
            'Ã‰': 'É', 'Ã€': 'À', 'Ãˆ': 'È', 'Ã¯': 'ï', 'Ã´': 'ô', 'Ã»': 'û',
            'â€¦': '...', 'Ã¢': 'â', 'Ãª': 'ê'
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)
            
    # replace terminology
    # Do case-sensitive replacement to match casing
    text = text.replace('scholars', 'friends').replace('Scholars', 'Friends')
    text = text.replace('scholar', 'friend').replace('Scholar', 'Friend')
    
    return text

input_file = 'c:/Users/user/Desktop/Omnireads/omni-frontend/src/goodreads_books.csv'
output_file = 'c:/Users/user/Desktop/Omnireads/omni-frontend/src/goodreads_books_temp.csv'

print("Starting to clean up the CSV file...")

try:
    with open(input_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8', newline='') as f_out:
        reader = csv.reader(f_in)
        writer = csv.writer(f_out)
        
        header = next(reader)
        writer.writerow(header)
        
        processed = 0
        for row in reader:
            writer.writerow([fix_text(col) for col in row])
            processed += 1
            if processed % 10000 == 0:
                print(f"Processed {processed} rows...")

    # Replace old file with the new cleaned one
    os.replace(output_file, input_file)
    print(f"Sanitization complete. Total {processed} rows processed.")
except Exception as e:
    print(f"An error occurred: {e}")
