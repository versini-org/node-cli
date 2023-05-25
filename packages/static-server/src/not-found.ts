export const renderNotFound = () => {
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
      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-size: 13px;
        background-color: #f7f7f7;
        padding: 2px 4px;
        border-radius: 3px;
      }
    </style>
  </head>

  <body>
    <header>
      <h1>
        No "index" file found and directory listing is disabled.
      </h1>
    </header>
    <main>
      <p>Hint: use the option <code>--dirs</code> to enable directory listing.</p>
	  </main>
  </body>
</html>
`;
};
