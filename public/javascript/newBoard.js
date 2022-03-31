const radioButtonCustom = document.getElementById("custom");
const radioButtonDefault = document.getElementById("default");

const column_1 = document.getElementsByName("column_1");
const column_2 = document.getElementsByName("column_2");
const column_3 = document.getElementsByName("column_3");

const selectColumn = document.getElementById("columnselect");

const addColumnButton = document.getElementById("addColumn");
const addColumnContainer = document.getElementById("add-column-container");


let removeColumn = document.querySelectorAll(".close-column-btn");


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
  const inputColumnText = `
  <div class="column">
  <input
  type="text"
  class="columnName form-control mb-2"
  name="column[column_${column_number}]"
  placeholder="Enter the column name"
  />
  <button type="button" class="btn-close close-column-btn" aria-label="Close"></button>
  </div>
  `;
  addColumnContainer.insertAdjacentHTML("beforeend", inputColumnText);
  column_number++;
  removeColumn = document.querySelectorAll(".close-column-btn");
  removeColumnFunction();
});


const removeColumnFunction = () => {
  removeColumn.forEach((btn) => {
    btn.addEventListener('click', function(){
      console.log("GI")
      const btnParent = btn.parentElement;
      btnParent.remove()
      column_number--;
      console.log(deleteInput)
    })
  })
}


removeColumnFunction();
