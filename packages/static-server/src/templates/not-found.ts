export const renderNotFound = (listDirectories: boolean) => {
	const messageHeading = listDirectories
		? "Static Server Directory Listing"
		: "Static Server";
	const messageNotFound = listDirectories
		? '<div class="not-found center">&nbsp;Page Not Found&nbsp;</div>'
		: '<div class="not-found center">&nbsp;No "index" file found and directory listing is disabled...&nbsp;</div>';

	const messageHint = listDirectories
		? ""
		: '<p class="center">Hint: use the option <code>--dirs</code> to enable directory listing.</p>';
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
      header, main {
        max-width: 900px;
      }
      h1 {
        color: #000;
        font-size: 18px;
        font-weight: bold;
        margin-top: 0;
        display: flex;
        justify-content: center;
      }
      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-size: 13px;
        background-color: #f7f7f7;
        padding: 2px 4px;
        border-radius: 3px;
      }
      .center {
        display: flex;
        justify-content: center;
      }
      .not-found::before,
      .not-found::after {
        content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-emoji-dizzy' viewBox='0 0 16 16'> <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z'/> <path d='M9.146 5.146a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708.708l-.647.646.647.646a.5.5 0 0 1-.708.708l-.646-.647-.646.647a.5.5 0 1 1-.708-.708l.647-.646-.647-.646a.5.5 0 0 1 0-.708zm-5 0a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 1 1 .708.708l-.647.646.647.646a.5.5 0 1 1-.708.708L5.5 7.207l-.646.647a.5.5 0 1 1-.708-.708l.647-.646-.647-.646a.5.5 0 0 1 0-.708zM10 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'/> </svg>");
      }
    </style>
  </head>

  <body>
    <header>
      <h1>
        ${messageHeading}
      </h1>
    </header>
    <main>
      ${messageNotFound}
      ${messageHint}
	  </main>
  </body>
</html>
`;
};
