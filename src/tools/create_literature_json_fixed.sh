#!/bin/bash

# Function to create JSON for a language
create_json() {
    local lang=$1
    local lang_code=$2
    local output_file="$lang-literature.json"
    
    echo "Processing $lang literature..."
    
    # Different patterns for each language based on what's actually in the catalog
    case $lang in
        "spanish")
            pattern="Cervantes|Lope de Vega|Calderón|Quevedo|Góngora|Garcilaso|Manrique|Rojas|Tirso|García Lorca|Machado|Jiménez|Alberti|Hernández|Aleixandre|Salinas|Guillén|Cernuda|Pardo Bazán|Pérez Galdós|Clarín|Blasco Ibáñez|Baroja|Unamuno|Azorín|Valle-Inclán|Benavente"
            ;;
        "german")
            pattern="Goethe|Schiller|Heine|Lessing|Herder|Novalis|Hoffmann|Kleist|Büchner|Hölderlin|Fontane|Keller|Raabe|Storm|Kafka|Mann|Hesse|Rilke|Musil|Brecht|Böll|Grass|Wolf|Frisch|Dürrenmatt|Bachmann|Celan|Sachs|Zweig|Schnitzler|Hofmannsthal|Trakl|Benn"
            ;;
        "russian")
            pattern="Tolstoy|Dostoevsky|Chekhov|Pushkin|Gogol|Turgenev|Gorky|Bunin|Pasternak|Akhmatova|Mandelstam|Tsvetaeva|Yesenin|Mayakovsky|Blok|Lermontov|Nekrasov|Solzhenitsyn|Shalamov|Grossman|Nabokov|Platonov|Bulgakov|Zamyatin|Babel"
            ;;
        "japanese")
            pattern="Murasaki|Bashō|Chikamatsu|Saikaku|Akinari|Sōseki|Ōgai|Ichiyō|Kyōka|Naoya|Akutagawa|Tanizaki|Kawabata|Mishima|Abe|Dazai|Ōe|Murakami|Yoshimoto|Kirino|Ogawa|Tawada|Enchi|Fumiko"
            ;;
        "chinese")
            pattern="Confucius|Laozi|Mencius|Zhuangzi|Sima Qian|Li Bai|Du Fu|Wang Wei|Bai Juyi|Su Shi|Li Qingzhao|Cao Xueqin|Wu Cheng|Shi Naian|Luo Guanzhong|Pu Songling|Lu Xun|Lao She|Ba Jin|Mao Dun|Shen Congwen|Ding Ling|Zhang Ailing|Qian Zhongshu|Yang Jiang|Mo Yan|Yu Hua|Su Tong|Wang Anyi"
            ;;
    esac
    
    # Create AWK script
    cat > "temp_${lang}_format.awk" << EOF
BEGIN {
    FS = ","
    print "["
}

\$5=="$lang_code" && (\$6 ~ /$pattern/) && NR>1 {
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
    gsub(/"/, "\\\\\"", title)
    gsub(/"/, "\\\\\"", author)
    
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
    
    echo "Created $output_file with $(grep -c '"id"' "$output_file") entries"
}

# Create JSON files for each language
create_json "spanish" "es"
create_json "german" "de" 
create_json "russian" "ru"
create_json "japanese" "ja"
create_json "chinese" "zh"

echo "All literature JSON files created!"