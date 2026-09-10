import type { MealFood } from "./meal-analysis";
export const foodColors = ["#ef967b", "#dfbe72", "#9ac775", "#c09cda", "#e8a746", "#7ec1c8", "#a8b7ed", "#d785a9", "#75b49c", "#b7ab82", "#97bcd2", "#cead9f"];
export function mealParts(foods: MealFood[], weights: number[], portion: number) {
  return foods.map((food,index)=>{
    const grams=(weights[index] ?? food.grams)*portion;
    const ratio=grams/food.grams;
    const protein=food.protein*ratio,carbs=food.carbs*ratio,fat=food.fat*ratio,fiber=food.fiber*ratio;
    return {...food,index,grams,protein,carbs,fat,fiber,kcal:protein*4+carbs*4+fat*9,color:foodColors[index%foodColors.length]};
  });
}
export function calorieSlices(values: number[]) {
  const total=values.reduce((a,b)=>a+b,0);
  let angle=0;
  return values.map(value=>{const start=angle;angle+=total?value/total*Math.PI*2:0;return {start,end:angle};});
}
