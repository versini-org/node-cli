type DirectoriesAndFiles = { href: string; name: string }[];

export const renderDirectories = (
	directories: DirectoriesAndFiles,
	files: DirectoriesAndFiles,
) => {
	const directoriesList = `${directories
		.map(
			(directory) =>
				`<li><a class="folder" href="${directory.href}">${directory.name}/</a></li>`,
		)
		.join("\n  ")}`;

	const filesList = `${files
		.map(
			(file) => `<li><a class="file" href="${file.href}">${file.name}</a></li>`,
		)
		.join("\n  ")}`;

	return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <title>Static Server Directory Listing</title>

    <style>
		body {
		  -webkit-font-smoothing: antialiased;
		  font-family: -apple-system, Calibri, "Helvetica Neue", sans-serif;
		  margin: 0;
		  padding: 20px;
		}
		main {
		  max-width: 900px;
		}
		header {
		  display: flex;
		  flex-wrap: wrap;
		  justify-content: space-between;
		}
		h1 {
		  color: #000;
		  font-size: 18px;
		  font-weight: bold;
		  margin-top: 0;
		}
		ul {
		  margin: 0 0 0 -2px;
		  padding: 20px 0 0 0;
		}
		ul li {
		  display: flex;
		  font-size: 14px;
		  justify-content: space-between;
		  list-style: none;
		}
		a {
		  text-decoration: none;
		}
		ul a {
		  color: #000;
		  display: block;
		  margin: 0 -5px;
		  overflow: hidden;
		  padding: 10px 5px;
		  text-overflow: ellipsis;
		  white-space: nowrap;
		  width: 100%;
		}
		svg {
		  height: 13px;
		  vertical-align: text-bottom;
		}
		ul a::before {
		  display: inline-block;
		  vertical-align: middle;
		  margin-right: 10px;
		  width: 24px;
		  text-align: center;
		  line-height: 12px;
		}
		ul a.file::before {
		  content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='currentColor' viewBox='0 0 16 16'> <path d='M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z'/> </svg>");
		}
		ul a:hover {
		  text-decoration: underline;
		}
		/* folder-icon */
		ul a.folder::before {
		  content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='currentColor' viewBox='0 0 16 16'> <path d='M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z'/> </svg>");
		}
		::selection {
		  background-color: #fff;
		  color: #000;
		}
		@media (min-width: 768px) {
		  ul {
			  display: flex;
			  flex-wrap: wrap;
		  }
		  ul li {
			  width: 230px;
			  padding-right: 20px;
		  }
		}
	</style>
  </head>

  <body>
    <main>
      <header>
        <h1>
          Static Server Directory Listing
        </h1>
      </header>


      <ul id="files">
        ${directoriesList}
        ${filesList}
      </ul>

	</main>
  </body>
</html>
`;
};
