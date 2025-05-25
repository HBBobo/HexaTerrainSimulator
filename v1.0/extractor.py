import os

def read_folders_list(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]

def walk_and_collect_structure(base_paths):
    structure = []
    file_contents = []
    for path in base_paths:
        if os.path.isfile(path):
            structure.append(os.path.basename(path))
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                content = f"[Error reading file: {e}]"
            file_contents.append((path, content))
        elif os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                level = root.replace(path, '').count(os.sep)
                indent = '  ' * level
                structure.append(f"{indent}{os.path.basename(root)}/")
                sub_indent = '  ' * (level + 1)
                for file in files:
                    filepath = os.path.join(root, file)
                    structure.append(f"{sub_indent}{file}")
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                    except Exception as e:
                        content = f"[Error reading file: {e}]"
                    file_contents.append((filepath, content))
        else:
            structure.append(f"[Nem található: {path}]")
    return structure, file_contents

def write_output(output_path, structure, file_contents):
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write("--- File Structure ---\n")
        for line in structure:
            out.write(line + '\n')

        out.write("\n--- File Contents ---\n")
        for path, content in file_contents:
            out.write(f"\n## {path} ##\n")
            out.write(content + '\n')

if __name__ == "__main__":
    folders_txt = "folders.txt"
    output_txt = "output.txt"

    if not os.path.exists(folders_txt):
        print(f"Nem található a '{folders_txt}' fájl.")
    else:
        folder_paths = read_folders_list(folders_txt)
        structure, contents = walk_and_collect_structure(folder_paths)
        write_output(output_txt, structure, contents)
        print(f"Kész: a kimenet a '{output_txt}' fájlba került.")
    
    input("Press any key to exit")