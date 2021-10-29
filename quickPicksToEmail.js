const fs = require("fs");
const vm = require("vm");

const pad = (number, size) => {
  let s = String(number);
  while (s.length < (size || 2)) {
    s = "0" + s;
  }
  return s;
};

function convertToHTML({ longName, padding, qp }) {
  try {
    const data = fs.readFileSync("lotteryemailtemplate.txt", "utf8");
    const template = (template, ctx) => {
      const script = new vm.Script("`" + template + "`");
      return script.runInNewContext(ctx);
    };

    const quickpicks = qp
      .map(
        (n) =>
          '<li style="list-style-position: inside; margin-left: 10px;">' +
          n.numbers
            .map(
              (n) =>
                '<span style="display: inline-block; margin: 0 5px"> &zwj;' +
                (padding ? pad(n, 2) : n) +
                "</span>"
            )
            .join("") +
          (n.pball
            ? '<span style="display: inline-block; margin: 0 25px"> ' +
              (padding ? pad(n.pball, 2) : n.pball) +
              "</span>"
            : "") +
          "</li>"
      )
      .join("");

    return template(data, { lotterygame: longName, quickpicks });
  } catch (err) {
    console.error(err);
    return err;
  }
}

function convertToText({ longName, padding, qp }) {
  try {
    let text = `Here are your ${longName} numbers\n\n`;

    text += qp
      .map(
        (n) =>
          n.numbers
            .map((n) => (padding ? pad(n, 2) : n) + " ")
            .join("")
            .trim() +
          (n.pball ? " pball: " + (padding ? pad(n.pball, 2) : n.pball) : "")
      )
      .join("\n\n");
    text += "\n\nGood Luck\n";

    return text;
  } catch (err) {
    console.error(err);
    return err;
  }
}

module.exports = {
  convertToHTML,
  convertToText,
};
