#!/bin/bash
set -euo pipefail

VERSION="0.9"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

perform_install(){
    # Remove older version
    if [ -d "/opt/xl-converter" ]; then
        echo "Removing the previous installation from /opt/xl-converter"
        sudo rm -rf "/opt/xl-converter/"
        sleep 0.5       # Stops menu entry from disappearing until restart
    fi

    # Install
    echo "Installing XL Converter to /opt/xl-converter"
    sudo cp -rf "$SCRIPT_DIR/xl-converter" /opt/
    sudo chmod -R +rx /opt/xl-converter

    if command -v xdg-user-dir &> /dev/null; then
        DESKTOP_DIR=$(xdg-user-dir DESKTOP)
        if [ -d "$DESKTOP_DIR" ]; then
            echo "Copying a .desktop file to $DESKTOP_DIR"
            cp -f "$SCRIPT_DIR/xl-converter.desktop" "$DESKTOP_DIR/"
        fi
    fi

    if [ -d "/usr/share/applications" ]; then
        echo "Adding a menu entry to /usr/share/applications"
        sudo cp -f "$SCRIPT_DIR/xl-converter.desktop" /usr/share/applications/
    fi

    echo "Installation complete."
}

request_root_permissions(){
    # Check if sudo is installed
    if ! command -v sudo &> /dev/null; then
        echo "Install sudo and try again."
        exit 1
    fi

    # Request root privileges from user (for copying files into /opt/)
    if [ "$EUID" -ne 0 ]; then
        sudo -v || { echo "Installation canceled, try again."; exit 1; }
    fi
}

post_install(){
    # Refresh start menu entries
    if command -v update-desktop-database &> /dev/null; then
        sudo update-desktop-database /usr/share/applications/ &> /dev/null
    fi
}

main(){
    echo -e "\nXL Converter $VERSION Installer\n"

    if [ -d "/opt/xl-converter" ]; then
        echo "[1] Update (/opt/xl-converter)"
    else
        echo "[1] Install (/opt/xl-converter)"
    fi

    echo -e "[2] Exit\n"

    while true; do
        read -r -p "Choice: " choice
        case "$choice" in 
            1)
                request_root_permissions
                perform_install
                post_install
                exit 0
                ;;
            2)
                echo "Exiting."
                exit 0
                ;;
            *)
                echo "Invalid option, try again."
                ;;
        esac
    done
}

main