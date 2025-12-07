# Script para agregar botón de retorno a index.html en todos los archivos HTML
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -File | Where-Object { $_.Name -ne "index.html" }
$buttonHtml = @'

    <div class="back-to-index">
        <a href="index.html" class="back-button">← Volver al Índice</a>
    </div>
'@
$css = @'
    <style>
        .back-to-index {
            text-align: center;
            margin: 2rem 0;
            padding: 1rem 0;
        }
        .back-button {
            display: inline-block;
            padding: 0.8rem 1.5rem;
            background-color: #2c3e50;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            transition: background-color 0.3s;
        }
        .back-button:hover {
            background-color: #1a252f;
        }
    </style>
'@

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Verificar si ya tiene el botón
    if ($content -notmatch 'class="back-to-index"') {
        # Insertar el botón antes del cierre del footer
        $newContent = $content -replace '(?s)(<footer[^>]*>.*?<div[^>]*>\s*<p[^>]*>.*?</p>\s*</div>\s*)(?=</footer>)', "`$1$buttonHtml"
        
        # Agregar CSS si no existe
        if ($newContent -notmatch '\.back-to-index') {
            $newContent = $newContent -replace '(</head>)', "$css`$1"
        }
        
        # Guardar los cambios
        $newContent | Set-Content -Path $file.FullName -Encoding UTF8
        Write-Host "Actualizado: $($file.Name)"
    } else {
        Write-Host "Ya tiene botón: $($file.Name)"
    }
}

Write-Host "¡Proceso completado!"
