#!/bin/bash

# Extract lines from pg_catalog.csv that have an author listed in authors.txt and are in the "fr" language
awk -F',' 'BEGIN{OFS=","} NR==1{print; next} $5=="fr" && ($6 ~ /Baudelaire|Rimbaud|Maupassant|Huysmans|Rachilde|Voltaire|Diderot|Montesquieu|Mallarme|Barbey d'\''aurevilly|Théophile Gaultier|Moliere|Rutebeuf/)' pg_catalog.csv > french-literature.csv

echo "Extracted French literature works to french-literature.csv"