const radioButtonCustom = document.getElementById("custom");
const radioButtonDefault = document.getElementById("default");

const column_1 = document.getElementsByName("column_1");
const column_2 = document.getElementsByName("column_2");
const column_3 = document.getElementsByName("column_3");

const selectColumn = document.getElementById("columnselect");

const addColumnButton = document.getElementById("addColumn");

radioButtonCustom.addEventListener("click", function () {
  selectColumn.classList.remove("hidden");
});

radioButtonDefault.addEventListener("click", function () {
  selectColumn.classList.add("hidden");
  column_1.value = "Went well";
  column_2.value = "To Improve";
  column_3.value = "Actions";
});

column_number = 4;

const cc = `<div>Hi</div>`;

addColumnButton.addEventListener("click", function () {
  if (column_number >= 6) {
    alert("You have reached the maximum columns");
    return;
  }
  const inputColumnText = `<input
type="text"
class="columnName form-control mb-2"
name="column[column_${column_number}]"
placeholder="Enter the column name"
/>`;
  selectColumn.insertAdjacentHTML("beforeend", inputColumnText);
  column_number++;
});
