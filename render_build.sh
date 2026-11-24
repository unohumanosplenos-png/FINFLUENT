#!/usr/bin/env bash
# exit on error
set -o errexit

# Front: compila React en dist/
npm install
npm run build

# Back: Render no trae pipenv, así que se instala con pip
pip install --upgrade pip
pip install -r requirements.txt

flask db upgrade     # crea / actualiza las tablas en Supabase
flask seed           # crea el super admin la primera vez