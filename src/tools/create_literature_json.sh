#!/bin/bash

# Function to create JSON for a language
create_json() {
    local lang=$1
    local lang_code=$2
    local authors_file="$lang-authors.txt"
    local output_file="$lang-literature.json"
    
    echo "Processing $lang literature..."
    
    # Create author regex pattern from authors file
    author_pattern=$(tr '\n' '|' < "$authors_file" | sed 's/|$//' | sed 's/|/\\|/g')
    
    # Create AWK script
    cat > "temp_${lang}_format.awk" << EOF
BEGIN {
    FS = ","
    print "["
}

\$5=="$lang_code" && (\$6 ~ /$author_pattern/) && NR>1 {
    id = \$1
    title = \$4
    author_field = \$6
    
    # Clean quotes from title and author
    gsub(/^"/, "", title)
    gsub(/"$/, "", title)
    gsub(/^"/, "", author_field)
    gsub(/"$/, "", author_field)
    
    # Extract first author name
    split(author_field, parts, ",")
    author = parts[1]
    gsub(/^ +/, "", author)
    
    # Escape quotes in strings
    gsub(/'/, "\\\\'", title)
    gsub(/'/, "\\\\'", author)
    
    if (count > 0) print ","
    printf "    { \"id\": \"%s\", \"title\": \"%s\", \"author\": \"%s\" }", id, title, author
    count++
}

END {
    if (count > 0) print ""
    print "]"
}
EOF
    
    # Run the extraction
    awk -f "temp_${lang}_format.awk" pg_catalog.csv > "$output_file"
    
    # Clean up
    rm "temp_${lang}_format.awk"
    
    echo "Created $output_file"
}

# Create JSON files for each language
create_json "spanish" "es"
create_json "german" "de" 
create_json "russian" "ru"
create_json "japanese" "ja"
create_json "chinese" "zh"

echo "All literature JSON files created!"